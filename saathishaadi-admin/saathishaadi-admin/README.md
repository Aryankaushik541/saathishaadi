# SaathiShaadi Admin Panel 🛡️

## Setup

```bash
cd saathishaadi-admin
cp .env.example .env
# .env mein apna backend URL daalo
npm install
npm start
```

## .env Configuration

```
REACT_APP_API_URL=http://localhost:5000/api
```

## Default Login

- **Username:** admin
- **Password:** saathishaadi@admin2025

> Backend ke `.env` mein `ADMIN_USERNAME` aur `ADMIN_PASSWORD` set karke change kar sakte hain.

## Features

### 📊 Dashboard
- Total users, active users, blocked users
- Total proposals, accepted proposals count
- Total messages count
- New users this week
- Gender distribution pie chart
- Religion breakdown pie chart
- Top 10 districts bar chart
- Quick summary metrics

### 👥 Users Management
- All users ki paginated list (20 per page)
- Search by name or phone number
- Filter by gender, religion, status (active/blocked)
- User block / unblock
- User delete (proposals & messages bhi delete hote hain)
- User detail modal

### 📢 Advertisements
- Ads create, edit, delete
- Ad activate/deactivate toggle
- Position: top / sidebar / inline
- Background color picker
- Live preview in modal
- Click tracking stats

## Build (Production)

```bash
npm run build
```

`build/` folder ko apne server pe serve karo.
