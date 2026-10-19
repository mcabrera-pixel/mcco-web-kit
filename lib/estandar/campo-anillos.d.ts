// Tipos de campo-anillos.js. Sin ellos, el chequeo de tipos de un sitio no ve los parámetros del campo, porque
// TypeScript no lee el JS de un paquete. test/estandar-campo.test.mjs compara sus claves con parametrosCampo.
export interface ParametrosCampo {
  r0: number;
  dr: number;
  paso: number;
  rmax: number;
  banda: [number, number, number];
  alfa: [number, number];
  largo: [number, number];
  ancho: [number, number];
  giro: number;
  tau: number;
  atenuacionNube: number;
}
/** Ajustes de un sitio: solo las claves que cambian, por separado para computador y para celular. */
export interface ParametrosCampoSitio {
  computador?: Partial<ParametrosCampo>;
  celular?: Partial<ParametrosCampo>;
}
export declare function parametrosCampo(movil: boolean, ajuste?: Partial<ParametrosCampo>): ParametrosCampo;
export declare function anillos(p: ParametrosCampo, semilla: number): Float32Array;
export declare function seguir(actual: [number, number], objetivo: [number, number], dt: number, tau: number): [number, number];
