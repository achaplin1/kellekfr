import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001'); // remplace par l'URL Railway

const sampleQuestions = [
  "Qui adore les chats ?",
  "Qui choisirait toujours du bleu ?",
  "Qui pourrait jouer dans un film d'action ?",
];

function App() {
  const [room, setRoom] = useState('');
  const [name, setName] = useState('');
  const [players, setPlayers] = useState([]);
  const [joined, setJoined] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    socket.on('updatePlayers', setPlayers);
    socket.on('nextQuestion', (index) => {
      setQuestionIndex(index);
      setGameStarted(true);
    });
    socket.on('gameOver', (data) => {
      setAnswers(data);
      setGameOver(true);
      setGameStarted(false);
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
    socket.emit('answer', {
      room,
      questionIndex,
      player
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-yellow-400 p-6 flex flex-col items-center text-center font-sans">
      <h1 className="text-4xl font-bold mb-4 text-white drop-shadow-lg">Qui de Nous ? 🎉</h1>

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
              <button key={p} onClick={() => sendAnswer(p)} className="rounded-xl bg-gray-200 p-2 hover:bg-gray-300">{p}</button>
            ))}
          </div>
        </div>
      ) : gameOver ? (
        <div className="mt-10 w-full max-w-xl text-left bg-white rounded-xl p-6 shadow-xl">
          <h2 className="text-2xl font-bold mb-4">Résultats 🎯</h2>
          {Object.entries(answers).map(([q, ans], idx) => (
            <div key={idx} className="mb-3">
              <p className="font-semibold">{sampleQuestions[q]}</p>
              <p className="text-sm">→ {ans.join(', ')}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default App;
