set('maxTime', 1);

const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
let sum = 0;

bench('forEach', () => arr.forEach(v => (sum ^= v)));

bench('for-of loop', () => {
  for (const v of arr) {
    sum ^= v;
  }
});

bench('for loop', () => {
  for (let i = 0; i < arr.length; i++) {
    sum ^= arr[i];
  }
});
