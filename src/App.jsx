import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { motion } from 'framer-motion';

const socket = io('kollek-production.up.railway.app'); // change this with Railway URL

const sampleQuestions = [
  "Qui adore les chats ?",
  "Qui choisirait toujours du bleu ?",
  "Qui pourrait jouer dans un film d'action ?",
];

export default function App() {
  const [room, setRoom] = useState('');
  const [name, setName] = useState('');
  const [players, setPlayers] = useState([]);
  const [joined, setJoined] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [gameOver, setGameOver] = useState(false);
  const [myAnswer, setMyAnswer] = useState(null);
  const [showingResultsIndex, setShowingResultsIndex] = useState(0);
  const [showingResults, setShowingResults] = useState(false);

  useEffect(() => {
    socket.on('updatePlayers', setPlayers);
    socket.on('nextQuestion', (index) => {
      setQuestionIndex(index);
      setGameStarted(true);
      setMyAnswer(null);
      new Audio('/next.mp3').play();
    });
    socket.on('gameOver', (data) => {
      setAnswers(data);
      setGameOver(true);
      setGameStarted(false);
      setShowingResults(true);
      new Audio('/end.mp3').play();
    });
  }, []);

  const joinRoom = () => {
    if (room && name) {
      socket.emit('joinRoom', { room, name });
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
          <button onClick={joinRoom} className="rounded-xl bg-black text-white px-4 py-2">Rejoindre</button>
        </div>
      ) : !gameStarted && !gameOver ? (
        <div className="space-y-4 max-w-md w-full mt-6">
          <h2 className="text-2xl text-white">Joueurs dans la salle</h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {players.map((p) => (
              <span key={p} className="bg-white text-black px-3 py-1 rounded-full shadow">{p}</span>
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
              <button key={p} onClick={() => sendAnswer(p)} className={`rounded-xl p-2 border ${myAnswer === p ? 'bg-green-600 text-white' : ''}`} disabled={!!myAnswer}>{p}</button>
            ))}
          </div>
          {myAnswer && <p className="mt-4 text-green-100">Réponse envoyée : {myAnswer}</p>}
        </div>
      ) : showingResults ? (
        <motion.div
          className="w-full max-w-xl p-6 bg-white rounded-xl shadow-xl"
          initial={{ rotateY: 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold mb-2">{sampleQuestions[showingResultsIndex]}</h2>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {Object.entries(groupedResults).map(([voter, votedFor], idx) => (
              <div key={idx} className={`p-4 rounded-xl shadow ${votedFor === mostVoted ? 'bg-green-100' : 'bg-gray-100'}`}>
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
