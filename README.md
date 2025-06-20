# 🥛 Amul Stock Bot

[![Telegram](https://img.shields.io/badge/Chat-Telegram-blue?logo=telegram)](https://t.me/AmulOSSBot)

Amul Stock Bot is a Telegram bot that lets you monitor the availability of Amul's protein-rich products — including shakes, lassi, whey, and paneer — directly from the official [Amul store](https://shop.amul.com).

---

## 🚀 Features

- 🔍 Browse all Amul protein products
- ✅ Track specific products for stock changes
- 📦 Get notified when products are back in stock
- 📉 View current inventory availability
- ⚡ Fast, real-time product updates (checked every minute)

---

## 🤖 Try It Now

👉 [Click here to open the bot](https://t.me/AmulOSSBot)
Or search for `@AmulOSSBot` in Telegram.

---

## 💻 Commands

| Command     | Description                             |
| ----------- | --------------------------------------- |
| `/start`    | Start the bot and see available options |
| `/products` | List all Amul protein products          |
| `/tracked`  | Show your tracked items                 |

---

## 🔧 Tech Stack

- **Node.js + TypeScript**
- **Telegraf.js** for Telegram bot framework
- **Axios** to fetch product data from Amul
- **MongoDB** (optional) for tracking users/products
- **node-cron** for scheduled stock checks

---

## 📦 Installation (Self-host)

```bash
git clone https://github.com/SwapnilSoni1999/amul-stock-bot.git
cd amul-stock-bot
pnpm install
cp .env.example .env # Fill in your Telegram Bot Token
pnpm start
```

## 🛡️ Disclaimer

This is an unofficial project and is not affiliated with or endorsed by Amul. All data is publicly accessible from shop.amul.com.

## 🧑‍💻 Contribute

Pull requests are welcome! If you have ideas to improve the bot — notifications, price tracking, or UI enhancements — feel free to open an issue or PR.

## 📜 License

MIT © 2025 Swapnil Soni
