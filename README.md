# Spent

**A free, private money tracker that runs entirely in your browser.** Log what you spend, earn, move, lend and borrow, keep on top of bills and subscriptions, save towards goals, and see where the money goes. There's no sign-up and no server: your entries stay on your device.

Open `index.html` to use it. On first load it shows sample data so you can look around; choose **Start fresh** to begin your own.

## What it does

- **Every kind of entry** from one form: expense, income, transfer, refund, lent, borrowed, got back and paid back.
- **Home** opens with what you've spent this month against your budget and what's left per day, then rows for what's due next, your accounts, your top expenses, recent entries, categories and goals.
- **Activity** lists everything by day. Search it, filter by type, category, account or person, and switch between one month and all time.
- **Recurring** covers bills, income and transfers, from weekly to yearly. Each one can have an end date, be skipped once, or add itself on its due date. Dealing with one adds the entry for you.
- **Wallet** shows accounts with running balances, savings goals with targets and dates, who owes whom with a Settle up button, and your net worth.
- **Insights** charts daily spending, spending by category, budgets, and money in against money out over six months.
- **Budgets** for the whole month and for single categories.
- **Ten themes** (Cinema, Cupertino, Aurora, Ultraviolet, Ember, Ledger, Terminal, Sakura, Graphite and Mist), each in dark and light, or matching your device. Mist puts frosted, see-through surfaces over a grainy blue haze.
- **39 currencies**, your own categories, CSV export, and JSON backup and restore.

Keyboard: `N` adds an entry, `/` jumps to search.

## Your data

Everything is saved in your browser's local storage, on the device you're using. Clearing your browser data erases it, so download a backup from Settings now and then. Nothing is sent anywhere.

## What it doesn't do

No bank connection, no receipt scanning, no CSV import, one currency at a time, and no shared household accounts.

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
| `src/js/` | The app, joined in file-name order: helpers, data model, sample data, storage, screens, forms, events |
| `src/build.py` | Joins the parts |

After editing, rebuild both pages:

```bash
python3 src/build.py
```

That writes `index.html` (the complete page for any static host) and `spent.html` (the same app as a fragment for publishing on claude.ai, where it can also save to the viewer's own Claude account).

## Design

The look takes its cue from streaming home screens (a billboard and rows of poster cards) and from Apple's large-title lists. It isn't made by or connected with Netflix or Apple.
