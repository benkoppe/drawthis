function hashSeed(seed: string): () => number {
	let hash = 1_779_033_703 ^ seed.length;

	for (let index = 0; index < seed.length; index += 1) {
		hash = Math.imul(hash ^ seed.charCodeAt(index), 3_432_918_353);
		hash = (hash << 13) | (hash >>> 19);
	}

	return () => {
		hash = Math.imul(hash ^ (hash >>> 16), 2_246_822_507);
		hash = Math.imul(hash ^ (hash >>> 13), 3_266_489_909);
		return (hash ^= hash >>> 16) >>> 0;
	};
}

export function createSeededRandom(seed: string): () => number {
	const nextSeed = hashSeed(seed);
	let a = nextSeed();
	let b = nextSeed();
	let c = nextSeed();
	let d = nextSeed();

	return () => {
		a >>>= 0;
		b >>>= 0;
		c >>>= 0;
		d >>>= 0;

		const result = (a + b + d) | 0;

		d = (d + 1) | 0;
		a = b ^ (b >>> 9);
		b = (c + (c << 3)) | 0;
		c = (c << 21) | (c >>> 11);
		c = (c + result) | 0;

		return (result >>> 0) / 4_294_967_296;
	};
}
