import { rollup } from 'rollup';
import babel from 'rollup-plugin-babel';
import cleanup from 'rollup-plugin-cleanup';

export default {
  plugins: [
    cleanup({
      comments:'none',
      maxEmptyLines: 1,
      sourceType: 'module'
    }),
    babel({
      exclude: 'node_modules/**'
    })
  ],
  moduleId: 'briq',
  moduleName: 'briq',
  targets: [
    { dest: 'dist/bundle.umd.js', format: 'umd' },
    { dest: 'dist/bundle.es.js', format: 'es' },
  ]
}
