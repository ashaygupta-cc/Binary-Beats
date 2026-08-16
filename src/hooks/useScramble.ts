import { useState, useEffect } from 'react';

export function useScramble(text: string, speed = 25, delay = 0) {
  const [displayText, setDisplayText] = useState('');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*_+?/';

  useEffect(() => {
    let interval: any;
    let frame = 0;
    const maxFrames = Math.min(text.length * 3, 60);

    const timer = setTimeout(() => {
      interval = setInterval(() => {
        if (frame >= maxFrames) {
          setDisplayText(text);
          clearInterval(interval);
          return;
        }

        const scrambled = text.split('').map((char, index) => {
          if (char === ' ') return ' ';
          const progress = frame / maxFrames;
          if (index / text.length < progress) {
            return text[index];
          }
          return chars[Math.floor(Math.random() * chars.length)];
        }).join('');

        setDisplayText(scrambled);
        frame += 1;
      }, speed);
    }, delay);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [text, speed, delay]);

  return displayText;
}
