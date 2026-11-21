# Spent

**A free, private money tracker that runs entirely in your browser.** Log what you spend, earn, move, lend and borrow, keep on top of bills and subscriptions, save towards goals, and see where the money goes. There's no sign-up and no server: your entries stay on your device.

Open `index.html` to use it. On first load it shows sample data so you can look around; choose **Start fresh** to begin your own.

## What it does

- **Every kind of entry** from one form: expense, income, transfer, refund, lent, borrowed, got back and paid back. Each records how it was paid (UPI, debit or credit card, cash, bank transfer or wallet) as well as which account it came from.
- **Quick add**: type an entry the way you'd say it, like "Spent ₹250 on lunch with Sam yesterday via UPI", and Spent fills in the amount, date, category, method, account and people.
- **Automatic categories**, learned from your own past entries first and common words and brands second. A category you pick always wins.
- **Home** shows what you've spent this month against your budget and what's left per day, today's spending, money available now, total savings, budget alerts, what's due next (bills and money owed), your accounts, insights, a six-month in-and-out chart, top expenses, recent entries, categories and goals.
- **Activity** lists everything by day, week, month, year or all time, with search and filters for type, category, payment method, account and person. A calendar view marks no-spend days and streaks.
- **Recurring** covers bills, income and transfers, from weekly to yearly. Each can have an end date, be skipped once, or add itself on its due date. A subscriptions summary shows what they cost a month and a year.
- **Wallet** shows accounts with running balances, savings goals with what to put aside each month and day, money lent and borrowed with pay-back dates and a Settle up button, and your net worth.
- **Budgets** for the whole month and for single categories, with alerts at 50%, 80% and 100%, and an option to carry last month's unused budget forward.
- **Insights** for a week, a month or a year: spending by day or month, by category and by payment method, budgets, and money in against money out. "What stands out" flags a forecast for the month, categories running ahead of usual, unusually large purchases, small purchases that add up, subscription costs and comparisons with earlier months. Each says how it was worked out.
- **Money health score** out of 100 from five parts (savings rate, budget discipline, spending consistency, debt and emergency savings), with tips and every formula shown. It isn't a credit score.
- **Import** transactions from your bank's CSV or Excel download, or pasted rows. Spent finds the columns, cleans up bank descriptions (a UPI narration becomes "Swiggy"), picks categories, skips duplicates and shows a preview first.
- **Reports** for any week, month or year as PDF, Excel or CSV, plus a full CSV export and JSON backup and restore.
- **Other currencies**: enter a one-off amount in another currency with the rate you got; totals stay in your own currency and the original is kept.
- **Reminders** for bills and repayments that are due, as notifications on the public site or the installed app.
- **Works offline and installs as an app** from the public site.
- **Ten themes** (Cinema, Cupertino, Aurora, Ultraviolet, Ember, Ledger, Terminal, Sakura, Graphite and Mist), each in dark and light, or matching your device. Mist puts frosted, see-through surfaces over a grainy blue haze.
- **39 currencies** and your own categories.

Keyboard: `N` adds an entry, `/` jumps to search.

## Your data and privacy

- Everything is saved in your browser's local storage, on the device you're using. Nothing is sent anywhere, and there's no account to sign up for.
- Clearing your browser data erases it, so download a backup from Settings now and then.
- Imported files are read on your device only. Spent never asks for bank logins, UPI PINs or passwords.
- Insights, automatic categories and the health score are calculated from your own entries. No AI service is used and nothing leaves your device.
- Everything typed or imported is checked and limited in length before it's saved, and shown as plain text.

## What it doesn't do

- No bank connection: transactions come in by hand, by quick add or by importing your bank's CSV or Excel file. Bank statement PDFs can't be read.
- No sign-in or sync between devices on the public site. Back up and restore to move your data.
- Reminders show when Spent is open, or on some phones while the installed app is closed. There's no server to send them otherwise.
- PDF reports write amounts as "INR 1,234.00", because the built-in PDF font has no ₹ sign or Indian scripts.
- No receipt scanning and no shared household accounts.

## Run it

It's a single static page with no dependencies to install.

- **Locally:** open `index.html` in a browser.
- **GitHub Pages:** in the repository's Settings, open Pages, choose "Deploy from a branch", and pick `main` and `/ (root)`.

Fonts load from Google Fonts; without a connection the app falls back to system fonts and still works.

## Change it

The page is built from the parts in `src/`:

| Path | What's in it |
| --- | --- |
| `src/themes.js` | The ten themes: ten colours per mode plus type and shape settings, and translucent surfaces for glass themes |
| `src/css/` | Styles |
| `src/body.html`, `src/head.html` | Page markup |
| `src/js/` | The app, joined in file-name order: helpers, data model, periods and budgets, smart features, sample data, storage, screens, insights, forms, import, reports, reminders, events |
| `src/sw.js` | The service worker that makes the public site work offline and shows reminders |
| `icons/` | App icons for installing Spent |
| `src/build.py` | Joins the parts |

After editing, rebuild both pages:

```bash
python3 src/build.py
```

That writes `index.html` (the complete page for any static host), `sw.js` and `manifest.webmanifest` (offline support and installing), and `spent.html` (the same app as a fragment for publishing on claude.ai, where it can also save to the viewer's own Claude account).

The import and report tools load SheetJS and jsPDF from cdnjs the first time they're used.

## Design

The look takes its cue from streaming home screens (a billboard and rows of poster cards) and from Apple's large-title lists. It isn't made by or connected with Netflix or Apple.
