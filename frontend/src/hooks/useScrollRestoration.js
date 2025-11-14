// frontend/src/hooks/useScrollRestoration.js
import { useCallback } from 'react';

/**
 * Hook para executar uma função async preservando o scroll
 *
 * @param {string} key - só pra manter compat com o uso atual (não é usado)
 * @param {Object} options
 * @param {string} [options.selector] - CSS selector do container scrollável. Ex: '#dashboard-scroll' ou '.dashboard-scroll'
 */
export default function useScrollRestoration(_key = 'default', options = {}) {
  const { selector } = options || {};

  const runWithPreservedScroll = useCallback(
    async (fn) => {
      if (typeof window === 'undefined' || typeof fn !== 'function') return;

      // Descobrir qual elemento tem o scroll
      let el;
      if (selector) {
        el = document.querySelector(selector);
      }

      const isWindow = !el;
      const getScroll = () => {
        if (isWindow) {
          return (
            window.scrollY ??
            window.pageYOffset ??
            document.documentElement.scrollTop ??
            0
          );
        }
        return el.scrollTop ?? 0;
      };

      const setScroll = (y) => {
        if (isWindow) {
          window.scrollTo({
            top: y,
            behavior: 'auto',
          });
        } else {
          el.scrollTop = y;
        }
      };

      const currentY = getScroll();

      try {
        await fn();
      } finally {
        // Deixa o React renderizar, depois restaura
        window.requestAnimationFrame(() => {
          setScroll(currentY);
        });
      }
    },
    [selector]
  );

  return { runWithPreservedScroll };
}
