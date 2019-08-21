// =================
// flight settings (you can change these)
// =================
const from = 'MDW'; // e.g. 'MDW'
const to = 'AUS'; // e.g. 'MDW'
const to2 = ''; // e.g. MDW
const leaveDate = '2019-10-20'; // format YYYY-MM-DD, e.g. '2019-10-30'
const returnDate = '2019-10-25'; // format YYYY-MM-DD, e.g. '2019-10-30'
const passengers = '1'; // e.g. '2'
const dealPriceThreshold = '300'; // price max, in USD, no symbols, e.g. '50', *optional
const dealPriceThresholdRoundtrip = '400'; // price max, in USD, no symbols, e.g. '50', *optional
const interval = '180'; // interval to check at, in minutes, e.g. '180', *optional
const departureTimeOfDay = 'ALL_DAY'; // ALL_DAY, BEFORE_NOON, NOON_TO_SIX, AFTER_SIX
const returnTimeOfDay = 'ALL_DAY'; // ALL_DAY, BEFORE_NOON, NOON_TO_SIX, AFTER_SIX

// =================
// sms settings (add these)
// -- find them here:
// https://www.twilio.com/console/project/settings
// =================
const twilioAccountSid = 'AC1e1f8ddf58138311dd5c7b7709cb52af';
const twilioAuthToken = '911de71a60ef09900e86658f75a12395';
const twilioPhoneFrom = '+13146824579';
const twilioPhoneTo = '+16364899166';



// =================
// don't change this
// =================
module.exports = {
  from,
  to,
  to2,
  leaveDate,
  returnDate,
  passengers,
  departureTimeOfDay,
  returnTimeOfDay,
  dealPriceThreshold,
  dealPriceThresholdRoundtrip,
  interval,
  twilioAccountSid,
  twilioAuthToken,
  twilioPhoneFrom,
  twilioPhoneTo,
};
