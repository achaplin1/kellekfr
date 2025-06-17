import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { motion } from 'framer-motion';

const socket = io('https://kollek-production.up.railway.app');

const sampleQuestions = [
  "Qui adore les chats ?",
  "Qui choisirait toujours du bleu ?",
  "Qui pourrait jouer dans un film d'action ?",
];

export default function QuiDeNous() {
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
    });
    socket.on('gameOver', (data) => {
      setAnswers(data);
      setGameOver(true);
      setGameStarted(false);
      setShowingResults(true);
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

  const currentResults = Array.isArray(answers[showingResultsIndex])
    ? answers[showingResultsIndex]
    : [];

  const groupedResults = {};
  if (Array.isArray(currentResults) && Array.isArray(players)) {
    currentResults.forEach((choice, i) => {
      const voter = players[i] || `Joueur ${i + 1}`;
      groupedResults[voter] = choice;
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-yellow-400 p-10 flex flex-col items-center text-center font-sans">
      <motion.h1 className="text-5xl font-extrabold mb-8 text-white drop-shadow-lg" initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        Qui de Nous ? 🎉
      </motion.h1>

      {!joined ? (
        <div className="space-y-6 max-w-xl w-full text-lg">
          <Input placeholder="Code de la salle" value={room} onChange={(e) => setRoom(e.target.value)} className="rounded-xl text-lg px-4 py-3" />
          <Input placeholder="Ton pseudo" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl text-lg px-4 py-3" />
          <Button onClick={joinRoom} className="rounded-xl px-6 py-3 text-lg bg-black text-white hover:bg-gray-900">Rejoindre</Button>
        </div>
      ) : !gameStarted && !gameOver ? (
        <div className="space-y-6 max-w-xl w-full mt-8">
          <h2 className="text-3xl text-white font-bold">Joueurs dans la salle</h2>
          <div className="flex flex-wrap gap-4 justify-center">
            {players.map((p) => (
              <span key={p} className="bg-white text-black px-5 py-2 rounded-full shadow text-lg font-medium">{p}</span>
            ))}
          </div>
          {players[0] === name && (
            <Button onClick={startGame} className="bg-black text-white rounded-xl px-6 py-3 text-lg mt-4 hover:bg-gray-800">
              Démarrer la partie
            </Button>
          )}
        </div>
      ) : gameStarted ? (
        <Card className="w-full max-w-2xl p-6 mt-8 text-lg">
          <CardContent>
            <h2 className="text-3xl font-semibold mb-6">{sampleQuestions[questionIndex]}</h2>
            <div className="grid grid-cols-2 gap-6">
              {players.map((p) => (
                <Button
                  key={p}
                  onClick={() => sendAnswer(p)}
                  className={`rounded-xl px-6 py-3 text-lg ${myAnswer === p ? 'bg-green-600 text-white' : ''}`}
                  disabled={!!myAnswer}
                >
                  {p}
                </Button>
              ))}
            </div>
            {myAnswer && <p className="mt-6 text-white text-xl">Réponse envoyée : <strong>{myAnswer}</strong></p>}
          </CardContent>
        </Card>
      ) : showingResults ? (
        <motion.div
          className="w-full max-w-2xl p-8 bg-white rounded-xl shadow-xl text-lg"
          initial={{ rotateY: 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold mb-4">{sampleQuestions[showingResultsIndex]}</h2>
          <div className="grid grid-cols-2 gap-6 mt-4">
            {Object.entries(groupedResults).map(([voter, votedFor], idx) => (
              <div key={idx} className="p-6 bg-gray-100 rounded-xl shadow text-center">
                <p className="text-xl font-bold mb-2">{voter}</p>
                <p className="text-base">a voté pour</p>
                <p className="text-2xl font-semibold text-green-700 mt-2">{votedFor}</p>
              </div>
            ))}
          </div>
          <Button onClick={nextResult} className="mt-8 rounded-xl bg-black text-white px-6 py-3 text-lg">Suivant</Button>
        </motion.div>
      ) : null}
    </div>
  );
}
