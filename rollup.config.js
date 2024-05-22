import eslint from '@rollup/plugin-eslint';
import { terser } from 'rollup-plugin-terser';
import babel from '@rollup/plugin-babel';
import typescript from '@rollup/plugin-typescript';

const version = process.env.VERSION || require('./package.json').version;
const author = require('./package.json').author;
const license = require('./package.json').license;

const banner =
	`/*!
      * Heatmap
      * (c) ${new Date().getFullYear()} ${author} (narayanaswamy14@gmail.com)
      * @license ${license}
      */`;

export default [{
	input: './src/main.ts',
	output: [{
		banner,
		file: 'dist/visualHeatmap.esm.js',
		format: 'esm',
		name: 'visualHeatmap'
	}, {
		file: 'dist/visualHeatmap.esm.min.js',
		banner,
		format: 'esm',
		name: 'visualHeatmap',
		compact: true,
		plugins: [terser()]
	}, {
		banner,
		file: 'dist/visualHeatmap.js',
		format: 'umd',
		name: 'visualHeatmap'
	}, {
		file: 'dist/visualHeatmap.min.js',
		banner,
		format: 'umd',
		name: 'visualHeatmap',
		compact: true,
		plugins: [terser()]
	}],
	plugins: [
		typescript({
			tsconfig: 'tsconfig.json',
			declarationDir: 'dist/types'
		}),
		eslint({
			fix: true,
			throwOnError: true
		}),
		babel({
	      babelHelpers: 'bundled',
	      exclude: 'node_modules/**' // Don't transpile node_modules
	    }),
	]
}];
