export const THEME_COLORS = { light: '#f3f1ec', dark: '#0b1220' };

/** Light by default, including on dark-system devices and when storage is blocked. */
export const themeInitScript = `(function(){var dark=false;try{dark=localStorage.getItem('theme')==='dark'}catch(e){}document.documentElement.classList.toggle('dark',dark)})();`;
