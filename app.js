const API_URL = 'https://kollek-production.up.railway.app/api'; // Remplace par ton vrai domaine Railway

let userId = localStorage.getItem('userId');
if (userId) connect(true);

function connect(auto = false) {
  if (!auto) {
    userId = document.getElementById('userIdInput').value.trim();
    const username = document.getElementById('usernameInput').value.trim();

    if (!userId) {
      userId = crypto.randomUUID();
    }

    localStorage.setItem('userId', userId);

    fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, username })
    })
    .then(() => {
      document.getElementById('login').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      document.getElementById('userIdDisplay').innerText = userId;
      loadInventory();
    });
  } else {
    document.getElementById('login').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.getElementById('userIdDisplay').innerText = userId;
    loadInventory();
  }
}

function logout() {
  localStorage.removeItem('userId');
  location.reload();
}

function openBooster() {
  fetch(`${API_URL}/open-booster`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  })
  .then(res => res.json())
  .then(loadInventory);
}

function loadInventory() {
  fetch(`${API_URL}/inventory/${userId}`)
    .then(res => res.json())
    .then(cards => {
      const list = document.getElementById('inventory');
      list.innerHTML = '';
      cards.forEach(card => {
        const li = document.createElement('li');
        li.textContent = `${card.name} (${card.rarity})`;
        list.appendChild(li);
      });
    });
}
