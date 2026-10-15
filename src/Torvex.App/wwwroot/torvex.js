// Apariencia: todo el color de la app sale de un tono (hue) y una saturación; el modo cambia solo las luminosidades.
window.torvex = {
  aplicarTema: function (tono, saturacion, modo) {
    var r = document.documentElement;
    r.style.setProperty('--h', tono);
    r.style.setProperty('--s', saturacion + '%');
    r.dataset.modo = modo;
    var oscuro = modo === 'oscuro' || (modo === 'sistema' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    r.style.colorScheme = oscuro ? 'dark' : 'light';
  },
  enfocar: function (id) {
    var e = document.getElementById(id);
    if (e) e.focus();
  }
};
