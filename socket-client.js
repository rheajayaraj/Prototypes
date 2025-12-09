const io = require('socket.io-client');
const socket = io('http://localhost:3000');

const providerId = '6937d7c83a02a984c6cc1a32';

socket.on('connect', () => {
  console.log('connected', socket.id);
  socket.emit('provider:join', { providerId });
  setInterval(() => {
    // simulate movement
    const lat = 12.97 + Math.random() * 0.01;
    const lng = 77.59 + Math.random() * 0.01;
    socket.emit('provider:location', { providerId, lat, lng });
  }, 5000);
});

socket.on('provider:location:update', (data) => {
  console.log('update:', data);
});
