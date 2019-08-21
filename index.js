#!/usr/bin/env node
'use strict';

const chalk = require('chalk');
const rainbow = require('chalk-rainbow');
const twilio = require('twilio');
const blessed = require('blessed');
const contrib = require('blessed-contrib');
const format = require('date-format');
const pretty = require('pretty-ms');
const airports = require('airports');
const puppeteer = require('puppeteer');
const moment = require('moment');

const settings = require('./settings');

// Time constants
const TIME_MS = 1;
const TIME_SEC = TIME_MS * 1000;
const TIME_MIN = TIME_SEC * 60;

// Fares
let prevLowestOutboundFare;
let prevLowestReturnFare;
let prevLowestRoundtrip;

const fares = {
  outbound: [],
  return: [],
  roundtrip: [],
};

// Configurable trip options
let originationAirportCode = settings.from;
let destinationAirportCode = settings.to;
let departureDate = moment(settings.leaveDate).format('MM/DD');
let returnDate = moment(settings.returnDate).format('MM/DD');
let adultPassengersCount = settings.passengers;
let dealPriceThreshold = parseInt(settings.dealPriceThreshold, 10);
let dealPriceThresholdRoundTrip = parseInt(settings.dealPriceThresholdRoundtrip, 10);
let interval = settings.interval ? parseFloat(settings.interval) : 30; // In minutes

const tSid = settings.twilioAccountSid;
const tAuth = settings.twilioAuthToken;
const tTo = settings.twilioPhoneTo;
const tFrom = settings.twilioPhoneFrom;

let twilioClient;

// Check if Twilio values are set
const isTwilioConfigured = tSid && tAuth && tFrom && tTo;

if (isTwilioConfigured) {
  twilioClient = new twilio(tSid, tAuth);
}

/**
 * Dashboard renderer
 */
class Dashboard {

  constructor() {
    this.markers = [];
    this.widgets = {};

    // Configure blessed
    this.screen = blessed.screen({
      title: 'SWA Dashboard',
      autoPadding: true,
      dockBorders: true,
      fullUnicode: true,
      smartCSR: true
    });

    this.screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

    // Grid settings
    this.grid = new contrib.grid({
      screen: this.screen,
      rows: 12,
      cols: 12
    });

    // Graphs
    this.graphs = {
      outbound: {
        title: 'Origin/Outbound',
        x: [],
        y: [],
        style: {
          line: 'red'
        }
      },
      return: {
        title: 'Destination/Return',
        x: [],
        y: [],
        style: {
          line: 'yellow'
        }
      },
      roundtrip: {
        title: 'Roundtrip',
        x: [],
        y: [],
        style: {
          line: 'magenta'
        }
      }
    };

    // Shared settings
    const shared = {
      border: {
        type: 'line'
      },
      style: {
        fg: 'blue',
        text: 'blue',
        border: {
          fg: 'green'
        }
      }
    };

    // Widgets
    const widgets = {
      map: {
        type: contrib.map,
        size: {
          width: 9,
          height: 5,
          top: 0,
          left: 0
        },
        options: Object.assign({}, shared, {
          label: 'Map',
          startLon: 54,
          endLon: 110,
          startLat: 112,
          endLat: 140,
          region: 'us'
        })
      },
      settings: {
        type: contrib.log,
        size: {
          width: 3,
          height: 5,
          top: 0,
          left: 9
        },
        options: Object.assign({}, shared, {
          label: 'Settings',
          padding: {
            left: 1
          }
        })
      },
      graph: {
        type: contrib.line,
        size: {
          width: 12,
          height: 4,
          top: 5,
          left: 0
        },
        options: Object.assign({}, shared, {
          label: 'Prices',
          showLegend: true,
          legend: {
            width: 20
          }
        })
      },
      log: {
        type: contrib.log,
        size: {
          width: 12,
          height: 3,
          top: 9,
          left: 0
        },
        options: Object.assign({}, shared, {
          label: 'Log',
          padding: {
            left: 1
          }
        })
      }
    };

    for (let name in widgets) {
      let widget = widgets[name];

      this.widgets[name] = this.grid.set(
        widget.size.top,
        widget.size.left,
        widget.size.height,
        widget.size.width,
        widget.type,
        widget.options
      )
    }
  }

  /**
   * Render screen
   *
   * @return {void}
   */
  render() {
    this.screen.render()
  }

  /**
   * Plot graph data
   *
   * @param {Object} prices
   *
   * @return {void}
   */
  plot(prices) {
    const now = format('MM/dd/yy-hh:mm:ss', new Date());

    Object.assign(this.graphs.outbound, {
      x: [...this.graphs.outbound.x, now],
      y: [...this.graphs.outbound.y, prices.outbound]
    });

    Object.assign(this.graphs.return, {
      x: [...this.graphs.return.x, now],
      y: [...this.graphs.return.y, prices.return]
    });

    Object.assign(this.graphs.roundtrip, {
      x: [...this.graphs.roundtrip.x, now],
      y: [...this.graphs.roundtrip.y, prices.roundtrip]
    });

    this.widgets.graph.setData([
      this.graphs.outbound,
      this.graphs.return,
      this.graphs.roundtrip,
    ])
  }

  /**
   * Add waypoint marker to map
   *
   * @param {Object} data
   *
   * @return {void}
   */
  waypoint(data) {
    this.markers.push(data);

    if (this.blink) {
      return
    }

    // Blink effect
    let visible = true;

    this.blink = setInterval(() => {
      if (visible) {
        this.markers.forEach((m) => this.widgets.map.addMarker(m))
      } else {
        this.widgets.map.clearMarkers()
      }

      visible = !visible;

      this.render()
    }, TIME_SEC)
  }

  /**
   * Log data
   *
   * @param {string[]} messages
   *
   * @return {void}
   */
  log(messages) {
    const now = format('MM/dd/yy-hh:mm:ss', new Date());
    messages.forEach((m) => this.widgets.log.log(`${now}: ${m}`))
  }

  /**
   * Display settings
   *
   * @param {Array<*>} config
   *
   * @return {void}
   */
  settings(config) {
    config.forEach((c) => this.widgets.settings.add(c))
  }
}

const dashboard = new Dashboard();

/**
 * Send a text message using Twilio
 *
 * @param {string} message
 *
 * @return {void}
 */
const sendTextMessage = async (message) => {
  try {
    await twilioClient.messages.create({
      body: message,
      from: tFrom,
      to: tTo,
    });
    dashboard.log([
      chalk.green(`Successfully sent SMS to ${tTo} from ${tFrom}`)
    ]);
  } catch(e) {
    dashboard.log([
      chalk.red(`Error: failed to send SMS to ${tTo} from ${tFrom}`)
    ]);
  }
};

/**
 * Fetch latest Southwest prices
 *
 * @return {void}
 */
async function fetch() {
  const saUrl = 'https://www.southwest.com';

  const browser = await puppeteer.launch();

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36');

  await page.goto(saUrl, {waitUntil: 'networkidle2'});
  await page.type('#LandingAirBookingSearchForm_originationAirportCode', originationAirportCode);
  await page.type('#LandingAirBookingSearchForm_destinationAirportCode', destinationAirportCode);
  await page.type('#LandingAirBookingSearchForm_departureDate', departureDate);
  await page.type('#LandingAirBookingSearchForm_returnDate', returnDate);
  await page.type('#LandingAirBookingSearchForm_adultPassengersCount', adultPassengersCount);

  const promoCodeInput = await page.$('#LandingAirBookingSearchForm_promoCode');
  promoCodeInput.press('Enter');

  const fairValueSelector = '.fare-button--value-total';

  await page.waitForNavigation({waitUntil: 'networkidle2'});
  await page.waitForSelector(fairValueSelector);

  const deptListHandle = await page.$('.search-results--container .container_standard:nth-child(2) .air-booking-select-price-matrix .transition-content ul');
  const deptResults = await deptListHandle.$$eval('li .fare-button--value-total', nodes => nodes.map(n => n.innerText));

  fares.outbound.push(...deptResults.map(res => parseInt(res, 10)).sort());

  await deptListHandle.dispose();

  const retListHandle = await page.$('.search-results--container .container_standard:nth-child(3) .air-booking-select-price-matrix .transition-content ul');
  const retResults = await retListHandle.$$eval('li .fare-button--value-total', nodes => nodes.map(n => n.innerText));

  fares.return.push(...retResults.map(res => parseInt(res, 10)).sort());

  await retListHandle.dispose();

  await browser.close();

  let faresAreValid = true;

  const lowestOutboundFare = Math.min(...fares.outbound);
  const lowestReturnFare = Math.min(...fares.return);
  const lowestRoundtrip = lowestOutboundFare + lowestReturnFare;

  const outboundFareDiff = (prevLowestOutboundFare || lowestOutboundFare) - lowestOutboundFare;
  const returnFareDiff = (prevLowestReturnFare || lowestReturnFare) - lowestReturnFare;
  const roundtripFareDiff = (prevLowestRoundtrip || lowestRoundtrip) - lowestRoundtrip;

  let outboundFareDiffString = '';
  let returnFareDiffString = '';
  let roundtripFareDiffString = '';

  // Create a string to show the difference
  if (!isNaN(outboundFareDiff) && !isNaN(returnFareDiff)) {

    // Usually this is because of a scraping error
    if (!isFinite(outboundFareDiff) || !isFinite(returnFareDiff)) {
      faresAreValid = false
    }

    if (outboundFareDiff > 0) {
      outboundFareDiffString = chalk.green(`(down \$${Math.abs(outboundFareDiff)})`)
    } else if (outboundFareDiff < 0) {
      outboundFareDiffString = chalk.red(`(up \$${Math.abs(outboundFareDiff)})`)
    } else if (outboundFareDiff === 0) {
      outboundFareDiffString = chalk.blue(`(no change)`)
    }

    if (returnFareDiff > 0) {
      returnFareDiffString = chalk.green(`(down \$${Math.abs(returnFareDiff)})`)
    } else if (returnFareDiff < 0) {
      returnFareDiffString = chalk.red(`(up \$${Math.abs(returnFareDiff)})`)
    } else if (returnFareDiff === 0) {
      returnFareDiffString = chalk.blue(`(no change)`)
    }

    if (roundtripFareDiff > 0) {
      roundtripFareDiffString = chalk.green(`(down \$${Math.abs(roundtripFareDiff)})`)
    } else if (returnFareDiff < 0) {
      roundtripFareDiffString = chalk.red(`(up \$${Math.abs(roundtripFareDiff)})`)
    } else if (returnFareDiff === 0) {
      roundtripFareDiffString = chalk.blue(`(no change)`)
    }
  }

  if (faresAreValid) {
    // Store current fares for next time
    prevLowestOutboundFare = lowestOutboundFare;
    prevLowestReturnFare = lowestReturnFare;
    prevLowestRoundtrip = lowestRoundtrip;

    // Do some Twilio magic (SMS alerts for awesome deals)
    if (dealPriceThreshold && (lowestOutboundFare <= dealPriceThreshold || lowestReturnFare <= dealPriceThreshold)) {
      const message = `Deal alert! Lowest fair has hit \$${lowestOutboundFare} (outbound) and \$${lowestReturnFare} (return)`;

      // Party time
      dashboard.log([
        rainbow(message)
      ]);

      if (isTwilioConfigured) {
        // sendTextMessage(message);
      }
    }

    // Do some Twilio magic (SMS alerts for awesome deals)
    if (dealPriceThresholdRoundTrip && lowestOutboundFare + lowestReturnFare <= dealPriceThresholdRoundTrip) {
      const message = `Roundtrip deal alert! Lowest fair has hit \$${lowestOutboundFare + lowestReturnFare}`;

      // Party time
      dashboard.log([
        rainbow(message)
      ]);

      if (isTwilioConfigured) {
        // sendTextMessage(message);
      }
    }

    dashboard.log([
      `Lowest fair for an outbound flight is currently \$${[lowestOutboundFare, outboundFareDiffString].filter(i => i).join(" ")}`,
      `Lowest fair for a return flight is currently \$${[lowestReturnFare, returnFareDiffString].filter(i => i).join(" ")}`,
      `Lowest fair for roundtrip is currently \$${[lowestRoundtrip, roundtripFareDiffString].filter(i => i).join(" ")}`,
    ]);

    dashboard.plot({
      outbound: lowestOutboundFare,
      return: lowestReturnFare,
      roundtrip: lowestRoundtrip,
    });
  }

  dashboard.render();

  fares.outbound = [];
  fares.return = [];
  fares.roundtrip = [];

  setTimeout(fetch, interval * TIME_MIN);
}

// Get lat/lon for airports (no validation on non-existent airports)
airports.forEach((airport) => {
  switch (airport.iata) {
    case originationAirportCode:
      dashboard.waypoint({ lat: airport.lat, lon: airport.lon, color: 'red', char: 'X' });
      break;

    case destinationAirportCode:
      dashboard.waypoint({ lat: airport.lat, lon: airport.lon, color: 'yellow', char: 'X' });
      break;

    default:
      break;
  }
});

// Print settings
dashboard.settings([
  `Origin airport: ${originationAirportCode}`,
  `Destination airport: ${destinationAirportCode}`,
  `Outbound date: ${departureDate}`,
  `Return date: ${returnDate}`,
  `Passengers: ${adultPassengersCount}`,
  `Interval: ${pretty(interval * TIME_MIN)}`,
  `Deal price: ${dealPriceThreshold ? `<= \$${dealPriceThreshold}` : 'disabled'}`,
  `SMS alerts: ${isTwilioConfigured ? tTo : 'disabled'}`
]);

process.nextTick(async () => {
  await fetch();
});
