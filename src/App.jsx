import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { motion } from 'framer-motion';

const socket = io('kollek-production.up.railway.app');

const sampleQuestions = [
  "Qui adore les chats ?",
  "Qui choisirait toujours du bleu ?",
  "Qui pourrait jouer dans un film d'action ?",
];

const avatars = [
  '/avatars/1.png',
  '/avatars/2.png',
  '/avatars/3.png',
  '/avatars/4.png',
  '/avatars/5.png',
  '/avatars/6.png',
];

export default function App() {
  const [room, setRoom] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(avatars[0]);
  const [players, setPlayers] = useState([]);
  const [playerAvatars, setPlayerAvatars] = useState({});
  const [joined, setJoined] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [gameOver, setGameOver] = useState(false);
  const [myAnswer, setMyAnswer] = useState(null);
  const [showingResultsIndex, setShowingResultsIndex] = useState(0);
  const [showingResults, setShowingResults] = useState(false);

  useEffect(() => {
    socket.on('updatePlayers', (data) => {
      setPlayers(data.players);
      setPlayerAvatars(data.avatars || {});
    });
    socket.on('nextQuestion', (index) => {
      setQuestionIndex(index);
      setGameStarted(true);
      setMyAnswer(null);
      new Audio('/next.mp3').play();
    });
    socket.on('gameOver', (data) => {
      setAnswers(data.answers);
      setGameOver(true);
      setGameStarted(false);
      setShowingResults(true);
      new Audio('/end.mp3').play();
    });
  }, []);

  const joinRoom = () => {
    if (room && name) {
      socket.emit('joinRoom', { room, name, avatar });
      setJoined(true);
    }
  };

  const startGame = () => {
    socket.emit('startGame', room);
  };

  const sendAnswer = (player) => {
    setMyAnswer(player);
    socket.emit('answer', {
      room,
      questionIndex,
      player,
      name
    });
  };

  const nextResult = () => {
    if (showingResultsIndex + 1 < sampleQuestions.length) {
      setShowingResultsIndex(showingResultsIndex + 1);
    } else {
      setShowingResults(false);
    }
  };

  const currentResults = answers[showingResultsIndex] || [];
  const groupedResults = {};
  currentResults.forEach((choice, i) => {
    const voter = players[i];
    groupedResults[voter] = choice;
  });

  const voteCount = {};
  Object.values(groupedResults).forEach(v => {
    voteCount[v] = (voteCount[v] || 0) + 1;
  });

  const mostVoted = Object.entries(voteCount).sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-yellow-400 p-6 flex flex-col items-center text-center font-sans">
      <h1 className="text-4xl font-bold mb-6 text-white drop-shadow-lg">Qui de Nous ? 🎉</h1>

      {!joined ? (
        <div className="space-y-4 max-w-md w-full">
          <input placeholder="Code de la salle" value={room} onChange={(e) => setRoom(e.target.value)} className="rounded-xl p-2 w-full" />
          <input placeholder="Ton pseudo" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl p-2 w-full" />
          <div className="flex flex-wrap justify-center gap-2">
            {avatars.map((a) => (
              <img key={a} src={a} onClick={() => setAvatar(a)} className={`w-14 h-14 rounded-full cursor-pointer border-4 ${avatar === a ? 'border-white' : 'border-transparent'}`} />
            ))}
          </div>
          <button onClick={joinRoom} className="rounded-xl bg-black text-white px-4 py-2">Rejoindre</button>
        </div>
      ) : !gameStarted && !gameOver ? (
        <div className="space-y-4 max-w-md w-full mt-6">
          <h2 className="text-2xl text-white">Joueurs dans la salle</h2>
          <div className="flex flex-wrap gap-4 justify-center">
            {players.map((p) => (
              <div key={p} className="flex flex-col items-center">
                <img src={playerAvatars[p]} className="w-12 h-12 rounded-full border" />
                <span className="text-white">{p}</span>
              </div>
            ))}
          </div>
          {players[0] === name && (
            <button onClick={startGame} className="bg-black text-white rounded-xl mt-4 px-4 py-2">Démarrer la partie</button>
          )}
        </div>
      ) : gameStarted ? (
        <div className="w-full max-w-xl p-4 mt-4 bg-white rounded-xl shadow-xl">
          <h2 className="text-2xl font-semibold mb-4">{sampleQuestions[questionIndex]}</h2>
          <div className="grid grid-cols-2 gap-4">
            {players.map((p) => (
              <button key={p} onClick={() => sendAnswer(p)} className={`rounded-xl p-2 border flex items-center gap-2 ${myAnswer === p ? 'bg-green-600 text-white' : ''}`} disabled={!!myAnswer}>
                <img src={playerAvatars[p]} className="w-6 h-6 rounded-full" /> {p}
              </button>
            ))}
          </div>
          {myAnswer && <p className="mt-4 text-green-100">Réponse envoyée : {myAnswer}</p>}
        </div>
      ) : showingResults ? (
        <motion.div className="w-full max-w-xl p-6 bg-white rounded-xl shadow-xl" initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: 0.6 }}>
          <h2 className="text-2xl font-bold mb-2">{sampleQuestions[showingResultsIndex]}</h2>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {Object.entries(groupedResults).map(([voter, votedFor], idx) => (
              <div key={idx} className={`p-4 rounded-xl shadow flex flex-col items-center ${votedFor === mostVoted ? 'bg-green-100' : 'bg-gray-100'}`}>
                <img src={playerAvatars[voter]} className="w-10 h-10 rounded-full mb-1" />
                <p className="font-bold">{voter}</p>
                <p className="text-sm">a voté pour</p>
                <p className="text-xl font-semibold">{votedFor}</p>
              </div>
            ))}
          </div>
          <button onClick={nextResult} className="mt-6 px-4 py-2 bg-black text-white rounded-xl">Suivant</button>
        </motion.div>
      ) : null}
    </div>
  );
}
