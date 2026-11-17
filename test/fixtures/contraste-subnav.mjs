// El peor fondo posible queda entre negro y blanco. Se compone el alfa del fondo de la barra
// sobre ambos extremos: si ambos pasan AA, también pasa cualquier superficie intermedia.
export async function contrasteSubnav(p) {
  return p.ev(`(async () => {
    const sub = document.querySelector('.std-subnav');
    const rgb = s => s.match(/[\\d.]+/g).map(Number);
    const mezclar = (a,b) => a.slice(0,3).map((v,i) => v*(a[3] ?? 1)+b[i]*(1-(a[3] ?? 1)));
    const lum = c => c.map(v => { v /= 255; return v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4; })
      .reduce((s,v,i) => s+v*[.2126,.7152,.0722][i],0);
    const ratio = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
    const frames = [], transiciones = [];
    function medir(t, paso) {
      const css = getComputedStyle(sub);
      const fondos = [[0,0,0],[255,255,255]].map(b => mezclar(rgb(css.backgroundColor),b));
      const elementos = [...sub.querySelectorAll('.std-subnav__titulo,.std-subnav__enlace,.std-subnav__accion')];
      const ratios = elementos.filter(e => getComputedStyle(e).display !== 'none').map(e => {
        const estilo = getComputedStyle(e), color = rgb(estilo.color), fondo = rgb(estilo.backgroundColor);
        return Math.min(...fondos.map(b => { const real = mezclar(fondo,b); return ratio(mezclar(color,real),real); }));
      });
      frames.push({t, paso, oscura:sub.classList.contains('is-oscura'), fondo:css.backgroundColor, minimo:Math.min(...ratios)});
      // Garantía adicional independiente del ritmo del navegador: ningún color se interpola.
      for (const e of [sub,...elementos]) {
        const s = getComputedStyle(e), dur = s.transitionDuration.split(',').map(parseFloat);
        const props = s.transitionProperty.split(',').map(v=>v.trim());
        props.forEach((prop,i) => {
          if (dur[i % dur.length] > 0 && (prop === 'all' || prop === 'color' || e === sub && /^background/.test(prop)))
            transiciones.push(prop);
        });
      }
    }
    const cuadro = () => new Promise((resolve,reject) => {
      const reloj = setTimeout(() => { cancelAnimationFrame(id); reject(new Error('SubNav: cuadro pendiente durante 2 s')); },2000);
      const id = requestAnimationFrame(t => { clearTimeout(reloj); resolve(t); });
    });
    for (const id of ['negro','negro-suave']) {
      scrollTo(0,0); await cuadro(); await cuadro();
      const bloque = document.getElementById(id);
      const borde = bloque.getBoundingClientRect().top+scrollY-sub.offsetHeight+1;
      for (const [desde,hasta] of [[borde-2,borde+2],[borde+2,borde-2]]) {
        scrollTo(0,desde); await new Promise(r => setTimeout(r,350));
        const paso = id+':'+(hasta>desde?'entrada':'salida');
        medir(performance.now(),paso);
        scrollTo(0,hasta);
        const inicio = performance.now();
        do { medir(await cuadro(),paso); } while (performance.now()-inicio < 350);
        medir(performance.now(),paso);
      }
    }
    scrollTo(0,0); await cuadro(); await cuadro();
    return { frames, transiciones:[...new Set(transiciones)] };
  })()`);
}
