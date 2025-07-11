# spaceterra 🚀

[![Node.js Version](https://img.shields.io/badge/node-16.x-brightgreen)](https://nodejs.org/)
[![npm Version](https://img.shields.io/badge/npm-8.x-blue)](https://www.npmjs.com/)
[![Express Version](https://img.shields.io/badge/express-4.17.1-blue)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-3.6.4-green)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/socket.io-3.1.1-orange)](https://socket.io/)
[![License: ISC](https://img.shields.io/badge/license-ISC-blue)](https://opensource.org/licenses/ISC)
[![Heroku Deployment](https://img.shields.io/badge/deployed%20on-Heroku-430098)](https://spaceterra.herokuapp.com)

**Developed by Haramrit Singh Khurana**  
▶️ [Play the Game Now!](https://spaceterra.herokuapp.com)

---

## About  
**SpaceTerra** is a single-player space adventure game inspired by *Sine Line*. Navigate an oscillating rocket through obstacles and aliens while avoiding collisions. Built with real-time leaderboard features using WebSockets.

---

## Tech Stack
- **Game Engine**: [Phaser.js](https://phaser.io)
- **Backend**: Node.js + [Express](https://expressjs.com/)  
- **Database**: [MongoDB](https://www.mongodb.com/)  
- **Real-Time Communication**: [Socket.io](https://socket.io/)  
- **Hosting**: [Heroku](https://heroku.com)

## Structure
The backend is split into a lightweight `server.js` that boots the HTTP
server and a separate Express app defined in `app.js`. Real-time
leaderboard events live in `sockets/leaderboard.js`, while environment
configuration resides in `config/index.js`.
Client-side game logic now lives in modular files under
`public/javascripts/states` with an entry script `public/javascripts/game.js`.

---

## Features  
- 🎮 Smooth oscillating rocket movement  
- 🌠 Procedurally generated obstacles  
- 🏆 Real-time leaderboard  
- 🔊 Sound effects and background music  
- 📱 Mobile-friendly controls  

---

## Installation  

1. **Clone the repository**  
   ```bash
   git clone https://github.com/haramrit09k/spaceterra.git
   cd spaceterra
   
2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   The server reads configuration such as the MongoDB connection string,
   Google OAuth credentials, and the Express session secret from the following
   variables: `MONGODB_URI`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   and `SESSION_SECRET`. Set these variables locally or through your hosting
   provider's config (e.g. Heroku **Config Vars**).

4. **Start the server**
   ```bash
   npm start
   ```

   The server entry point now lives in `server.js` and uses an Express
   application exported from `app.js`.

5. Open in browser
   
Visit `http://localhost:3000` to play!

---

Enjoy the game!
For issues or suggestions, open a [GitHub Issue](https://github.com/haramrit09k/spaceterra/issues).


#### Screenshots:

##### Home Page:
![Home Page](screenshots/homepage.png)

##### Instructions:
![Instructions](screenshots/instructions.png)

##### Leaderboard:
![Leaderboard](screenshots/leaderboard.png)

##### Game Play:
![Game Play](screenshots/game.png)
