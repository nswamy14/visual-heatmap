import commonjs from 'rollup-plugin-commonjs';
import { eslint } from 'rollup-plugin-eslint';
import { terser } from 'rollup-plugin-terser';
import buble from 'rollup-plugin-buble';

const version = process.env.VERSION || require('./package.json').version;
const author = require('./package.json').author;
const license = require('./package.json').license;

const banner =
	`/*!
      * Heatmap v${version}
      * (c) ${new Date().getFullYear()} ${author} (narayanaswamy14@gmail.com)
      * @license ${license}
      */`;

export default [{
	input: './main.js',
	output: [{
		banner,
		file: 'dist/visualHeatmap.esm.browser.js',
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
	input: './main.js',
	output: [{
		banner,
		file: 'dist/visualHeatmap.legacy.js',
		format: 'umd',
		name: 'visualHeatmap'
	}],
	plugins: [
		commonjs(),
		eslint({
			fix: true,
			throwOnError: true
		}),
		buble()
	]
}, {
	input: './main.js',
	output: [{
		file: 'dist/visualHeatmap.min.js',
		banner,
		format: 'umd',
		name: 'visualHeatmap',
		compact: true
	}, {
		file: 'dist/visualHeatmap.esm.browser.min.js',
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
}, {
	input: './main.js',
	output: [{
		banner,
		file: 'dist/visualHeatmap.legacy.min.js',
		format: 'umd',
		name: 'visualHeatmap'
	}],
	plugins: [
		commonjs(),
		eslint({
			fix: true,
			throwOnError: true
		}),
		buble(),
		terser()
	]
}];
