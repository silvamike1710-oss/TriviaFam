const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let games = {};

function sendQuestion(pin) {
  const game = games[pin];
  if (!game) return;

  const q = game.questions[game.questionIndex];
  game.answers = {};

  console.log("Sending question index:", game.questionIndex);

  io.to(pin).emit("new_question", q);

  setTimeout(() => {
    endQuestion(pin);
  }, q.time * 1000);
}

function endQuestion(pin) {
  const game = games[pin];
  if (!game) return;

  console.log("Ending question:", game.questionIndex);

  io.to(pin).emit("question_result", {
    correctAnswer: game.questions[game.questionIndex].answer,
    answers: Object.values(game.answers),
    players: game.players
  });

  setTimeout(() => {
    game.questionIndex++;

    console.log("Next question index:", game.questionIndex);

    if (game.questionIndex >= game.questions.length) {
      console.log("Game over");
      io.to(pin).emit("game_over", game.players);
      return;
    }

    sendQuestion(pin);
  }, 5000);
}

function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("create_game", () => {
    const pin = generatePIN();
    games[pin] = {
      host: socket.id,
      players: [],
      questionIndex: 0,
      answers: {},
      questions: [
        {
          question: "Capital of France?",
          options: ["Paris", "Berlin", "Madrid", "Rome"],
          answer: 0,
          time: 10
        },
        {
          question: "2 + 2?",
          options: ["3", "4", "5", "6"],
          answer: 1,
          time: 10
        },
        {
          question: "2 + 2?",
          options: ["3", "4", "5", "6"],
          answer: 1,
          time: 10
        },
        {
          question: "2 + 2?",
          options: ["3", "4", "5", "6"],
          answer: 1,
          time: 10
        },
        {
          question: "2 + 2?",
          options: ["3", "4", "5", "6"],
          answer: 1,
          time: 10
        },
        {
          question: "2 + 2?",
          options: ["3", "4", "5", "6"],
          answer: 1,
          time: 10
        },
        {
          question: "2 + 2?",
          options: ["3", "4", "5", "6"],
          answer: 1,
          time: 10
        },
      ]
    };

    socket.join(pin);
    socket.emit("game_created", pin);
  });

  socket.on("join_game", ({ pin, name }) => {
    console.log("JOIN:", name, pin);

    if (!games[pin]) {
      console.log("Game not found");
      return;
    }

    const existing = games[pin].players.find(p => p.id === socket.id);
    if (existing) return;

    const player = { id: socket.id, name, score: 0 };
    games[pin].players.push(player);

    socket.join(pin);
    io.to(pin).emit("players_update", games[pin].players);
  });

  socket.on("rejoin_game", ({ pin, name }) => {
    if (!games[pin]) return;

    const player = games[pin].players.find(p => p.name === name);
    if (player) {
      player.id = socket.id;
    } else {
      games[pin].players.push({ id: socket.id, name, score: 0 });
    }

    socket.join(pin);
    io.to(pin).emit("players_update", games[pin].players);
  });

  socket.on("start_game", (pin) => {
    console.log("START GAME received for PIN:", pin);
    sendQuestion(pin);
  });

  socket.on("answer", ({ pin, answer }) => {
    const game = games[pin];
    if (!game) return;

    const q = game.questions[game.questionIndex];
    const player = game.players.find(p => p.id === socket.id);
    if (!player || game.answers[socket.id]) return;

    const correct = answer === q.answer;
    game.answers[socket.id] = { name: player.name, answer, correct };

    if (correct) player.score += 100;

    io.to(pin).emit("players_update", game.players);
    io.to(game.host).emit("answer_update", Object.values(game.answers));
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});