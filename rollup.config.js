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
		file: 'dist/heatmap.esm.browser.js',
		format: 'esm',
		name: 'heatmap'
	}, {
		banner,
		file: 'dist/heatmap.js',
		format: 'umd',
		name: 'heatmap'
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
		file: 'dist/heatmap.legacy.js',
		format: 'umd',
		name: 'heatmap'
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
		file: 'dist/heatmap.min.js',
		banner,
		format: 'umd',
		name: 'heatmap',
		compact: true
	}, {
		file: 'dist/heatmap.esm.browser.min.js',
		banner,
		format: 'esm',
		name: 'heatmap',
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
		file: 'dist/heatmap.legacy.min.js',
		format: 'umd',
		name: 'heatmap'
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
