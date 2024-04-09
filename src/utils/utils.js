export function isNullUndefined (val) {
	return val === null || val === undefined;
}

export function isNotNumber (val) {
	return typeof val !== 'number';
}

export function isSortedAscending (arr) {
	for (let i = 0; i < arr.length - 1; i++) {
		if (arr[i + 1].offset - arr[i].offset < 0) {
			return false;
		}
	}
	return true;
}

export function getPixlRatio (ctx) {
	const dpr = window.devicePixelRatio || 1;
	const bsr = ctx.webkitBackingStorePixelRatio ||
        ctx.mozBackingStorePixelRatio ||
        ctx.msBackingStorePixelRatio ||
        ctx.oBackingStorePixelRatio ||
        ctx.backingStorePixelRatio || 1;

	return dpr / bsr;
}
