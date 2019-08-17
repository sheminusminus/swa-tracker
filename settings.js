// =================
// flight settings (you can change these)
// =================
const from = ''; // e.g. 'MDW'
const to = ''; // e.g. 'MDW'
const leaveDate = ''; // format YYYY-MM-DD, e.g. '2019-10-30'
const returnDate = ''; // format YYYY-MM-DD, e.g. '2019-10-30'
const passengers = ''; // e.g. '2'
const dealPriceThreshold = ''; // price max, in USD, no symbols, e.g. '50'
const interval = ''; // interval to check at, in minutes, e.g. '180' for every 3-hours

// =================
// sms settings (add these)
// -- find them here:
// https://www.twilio.com/console/project/settings
// =================
const twilioAccountSid = '';
const twilioAuthToken = '';
const twilioPhoneFrom = '';
const twilioPhoneTo = '';



// =================
// don't change this
// =================
module.exports = {
  from,
  to,
  leaveDate,
  returnDate,
  passengers,
  dealPriceThreshold,
  interval,
  twilioAccountSid,
  twilioAuthToken,
  twilioPhoneFrom,
  twilioPhoneTo,
};
