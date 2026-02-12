import net from 'net';

const host = 'ep-shy-frost-ahwlyvq6.c-3.us-east-1.aws.neon.tech';
const port = 5432;

console.log(`Connecting to ${host}:${port}...`);

const socket = new net.Socket();

const timeout = setTimeout(() => {
    console.log('TCP Connection timed out after 10s');
    socket.destroy();
    process.exit(1);
}, 10000);

socket.connect(port, host, () => {
    console.log('TCP Connection SUCCESSFUL!');
    clearTimeout(timeout);
    socket.destroy();
    process.exit(0);
});

socket.on('error', (err) => {
    console.log('TCP Connection FAILED:', err.message);
    clearTimeout(timeout);
    process.exit(1);
});
