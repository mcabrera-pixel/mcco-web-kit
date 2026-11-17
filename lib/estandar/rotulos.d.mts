// Tipos de rotulos.mjs. Sin ellos, el chequeo de tipos de un sitio ve `origen` de Producto y Galeria como cualquier
// texto, porque TypeScript no lee el JS de un paquete. test/estandar-rotulos.test.mjs los compara con ROTULOS.
export declare const ROTULOS: Readonly<{
  real: 'Foto de faena';
  render: 'Render 3D';
  ilustracion: 'Ilustración';
  esquema: 'Esquema';
  captura: 'Captura de simulación';
}>;
export declare function rotuloDe(origen: string): string;
export declare function rotuloDeVideo(origen: string): string;
