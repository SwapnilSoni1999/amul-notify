# 🥛 Amul Stock Notification Bot

[![Telegram](https://img.shields.io/badge/Chat-Telegram-blue?logo=telegram)](https://t.me/AmulOSSBot)
[![GitHub stars](https://img.shields.io/github/stars/SwapnilSoni1999/amul-notify?style=social)](https://github.com/SwapnilSoni1999/amul-notify)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Endpoint Badge](https://img.shields.io/endpoint?url=https%3A%2F%2Fbots.10xdev.me%2Famul-bot%2Fbadge)

A powerful Telegram bot that helps you track the availability of Amul's protein-rich products including protein shakes, lassi, whey protein, paneer, and more. Get real-time notifications when your favorite products are back in stock in your local area!

<div align="center">

**[🤖 Try the Bot Now](https://t.me/AmulOSSBot)** • **[⭐ Star on GitHub](https://github.com/SwapnilSoni1999/amul-notify)** • **[📞 Contact Developer](https://t.me/SoniSins)**

</div>

---

## ✨ Features

- 🔍 **Browse Products**: View all Amul protein products with real-time availability
- 📍 **Location-Based**: Set your pincode to get local stock updates
- � **Smart Notifications**: Get notified instantly when tracked products are back in stock
- � **Stock Tracking**: Monitor inventory levels and stock changes
- ⚡ **Real-Time Updates**: Automated checks every 3 minutes
- 📱 **User-Friendly**: Simple Telegram interface with inline buttons
- 🎯 **Selective Tracking**: Track only the products you care about
- 📈 **Analytics**: View bot statistics and usage data

---

## 🚀 Quick Start

### For Users

1. **Start the Bot**: [Click here to open @AmulOSSBot](https://t.me/AmulOSSBot)
2. **Set Your Location**: Use `/setpincode YOUR_PINCODE` to set your area
3. **Browse Products**: Use `/products` to see all available items
4. **Track Items**: Click the "Track" button next to products you want to monitor
5. **Get Notified**: Receive instant notifications when items are back in stock

### Example Usage

```
/start                    # Welcome message and setup
/setpincode 400001        # Set your pincode (Mumbai in this example)
/products                 # Browse all protein products
/tracked                  # View your tracked items
/support                  # Get help and contact info
```

---

## 🤖 Bot Commands

| Command       | Description                              | Example              |
| ------------- | ---------------------------------------- | -------------------- |
| `/start`      | Initialize bot and show welcome message  | `/start`             |
| `/setpincode` | Set your delivery pincode                | `/setpincode 400001` |
| `/products`   | List all available Amul protein products | `/products`          |
| `/tracked`    | Show products you're currently tracking  | `/tracked`           |
| `/pincode`    | View your current pincode setting        | `/pincode`           |
| `/support`    | Get support and contact information      | `/support`           |

### Admin Commands (Bot Owner Only)

| Command      | Description                   |
| ------------ | ----------------------------- |
| `/broadcast` | Send message to all bot users |
| `/stats`     | View bot usage statistics     |
| `/sessions`  | View active Amul API sessions |

---

## 🏗️ Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Bot Framework**: [Telegraf.js](https://telegraf.js.org/) - Modern Telegram bot framework
- **Database**: MongoDB with Mongoose ODM
- **HTTP Client**: Axios for API requests
- **Caching**: Redis for performance optimization
- **Scheduling**: node-cron for automated stock checks
- **Process Management**: PM2 for production deployment
- **Code Quality**: ESLint + Prettier for code formatting

---

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ and pnpm
- MongoDB database
- Redis server (optional, for caching)
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))

### Installation

```bash
# Clone the repository
git clone https://github.com/SwapnilSoni1999/amul-notify.git
cd amul-notify

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env.dev
# Edit .env.dev with your configuration

# Run in development mode
pnpm run dev

# Or build and run in production
pnpm run build
pnpm start
```

### Environment Variables

Create `.env.dev` for development or `.env.prod` for production:

```env
# Bot Configuration
BOT_TOKEN=your_telegram_bot_token
BOT_USERNAME=YourBotUsername

# Database
MONGODB_URI=mongodb://localhost:27017/amul-notify

# Redis (Optional)
REDIS_URL=redis://localhost:6379

# Bot Settings
TRACKER_ENABLED=true
LOG_CHANNEL_ID=your_log_channel_id
ADMIN_USER_IDS=123456789,987654321

# Environment
NODE_ENV=development
```

### Available Scripts

```bash
pnpm run dev         # Start development server with hot reload
pnpm run build       # Build the project
pnpm start           # Start production server
pnpm run lint        # Run ESLint
pnpm run prettier    # Format code with Prettier
pnpm run seed:dev    # Seed database with admin users (development)
pnpm run seed:prod   # Seed database with admin users (production)
```

---

## 🚀 Deployment

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Build the project
pnpm run build

# Start with PM2
pm2 start dist/server.js --name "amul-notify"

# Monitor
pm2 status
pm2 logs amul-notify
```

### Using Docker (Recommended)

```bash
# Build Docker image
docker build -t amul-notify .

# Run container
docker run -d \
  --name amul-notify \
  --env-file .env.prod \
  -p 3000:3000 \
  amul-notify
```

---

## � Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add some amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow the existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Use conventional commit messages
- Ensure all emojis use the centralized `emoji.util.ts`

---

## 📊 Features in Detail

### Smart Stock Tracking

- Monitors product availability every 5 minutes
- Tracks inventory changes across different locations
- Sends instant notifications when products come back in stock

### Location-Based Filtering

- Uses Indian pincode system for location detection
- Shows only products available in your delivery area
- Supports multiple substores and distribution centers

### User Management

- Automatic user registration on first interaction
- Tracks user preferences and pincode settings
- Rate limiting to prevent spam

### Admin Features

- Broadcast messages to all users
- View comprehensive bot statistics
- Monitor API sessions and performance

---

## 🛡️ Privacy & Disclaimer

- **Privacy**: This bot only stores your Telegram user ID and chosen pincode for functionality
- **Data Source**: All product data is fetched from the official Amul store (shop.amul.com)
- **Unofficial**: This project is not affiliated with or endorsed by Amul
- **Purpose**: Educational and utility project to help users track product availability

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## � Acknowledgments

- [Amul](https://amul.com) for providing the product data through their public API
- [Telegraf.js](https://telegraf.js.org/) for the excellent Telegram bot framework
- All contributors and users who help improve this bot

---

<div align="center">

**Made with ❤️ by [Swapnil Soni](https://github.com/SwapnilSoni1999)**

[🤖 Try the Bot](https://t.me/AmulOSSBot) • [⭐ Star on GitHub](https://github.com/SwapnilSoni1999/amul-notify) • [📞 Contact](https://t.me/SoniSins)

</div>
