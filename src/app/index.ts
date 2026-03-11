import express from 'express';
import routes from './routes.js';

const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');

app.use(express.json());
app.use(routes);

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

const serverPort = Number(process.env.PORT || 8000);
app.listen(serverPort, '0.0.0.0', () => {
  console.log(`safe-anvil-mock listening on ${serverPort}`);
});
