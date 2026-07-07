import Phaser from 'phaser';
import { GameConfig } from './config';
import './style.css';

// Initialize the Phaser game when the page loads
window.addEventListener('load', () => {
  new Phaser.Game(GameConfig);
});
