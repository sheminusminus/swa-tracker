# swa-tracker
dashboard to monitor and receive alerts for changes in southwest fare prices.

![image](https://cloud.githubusercontent.com/assets/6979737/17740385/08603f62-645e-11e6-9abf-df4851a95f29.png)

## requirements

install [nodejs](https://nodejs.org/en/) (version 10+, i'm using 10.15)

## installation

open a terminal and:

```bash
git clone https://github.com/sheminusminus/swa-tracker.git
cd swa-tracker
npm install
npm link
open .
```

this should open the swa-tracker folder in finder.

from here, open the `settings.js` file. this is where you can change flight settings, and add settings for twilio sms.

## usage

after completing the installation steps, you can start swa-tracker by opening a terminal and running:

```bash
swa
```

### info - twilio integration

if you have a twilio account (a free trial account will get you by for quite some time)
and you've set up a deal price threshold, you can set edit the twilio values in `settings.js` to set up sms
deal alerts.

_just be warned: as long as the deal threshold is met, you're going
to receive sms messages at the rate of the interval you defined._

to set up twilio, create an account, create a new project (type: products > programmable sms),
create a new phone number, and finally, verify your regular cell number.

they'll start you off with like $15 or $20. sending an sms message costs something like 2 cents.
