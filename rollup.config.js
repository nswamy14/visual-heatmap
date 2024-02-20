import commonjs from "@rollup/plugin-commonjs";
import eslint from '@rollup/plugin-eslint';
import { terser } from "rollup-plugin-terser";

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
	input: './src/main.js',
	output: [{
		banner,
		file: 'dist/visualHeatmap.esm.js',
		format: 'esm',
		name: 'visualHeatmap'
	}, {
		banner,
		file: 'dist/visualHeatmap.js',
		format: 'umd',
		name: 'visualHeatmap'
	}],
	plugins: [
		commonjs(),
		eslint({
			fix: true,
			throwOnError: true
		})]
}, {
	input: './src/main.js',
	output: [{
		file: 'dist/visualHeatmap.min.js',
		banner,
		format: 'umd',
		name: 'visualHeatmap',
		compact: true
	}, {
		file: 'dist/visualHeatmap.esm.min.js',
		banner,
		format: 'esm',
		name: 'visualHeatmap',
		compact: true
	}],
	plugins: [
		commonjs(),
		terser(),
		eslint({
			fix: true,
			throwOnError: true
		})]
}];
