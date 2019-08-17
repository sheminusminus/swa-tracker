// =================
// flight settings (you can change these)
// =================
const from = 'MDW'; // e.g. 'MDW'
const to = 'AUS'; // e.g. 'MDW'
const leaveDate = '2019-10-20'; // format YYYY-MM-DD, e.g. '2019-10-30'
const returnDate = '2019-10-25'; // format YYYY-MM-DD, e.g. '2019-10-30'
const passengers = '1'; // e.g. '2'
const dealPriceThreshold = '300'; // price max, in USD, no symbols, e.g. '50', *optional
const interval = '1'; // interval to check at, in minutes, e.g. '180', *optional

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
