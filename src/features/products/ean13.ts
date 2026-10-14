const LEFT_ODD: Record<string, string> = {
  '0': '0001101', '1': '0011001', '2': '0010011', '3': '0111101', '4': '0100011',
  '5': '0110001', '6': '0101111', '7': '0111011', '8': '0110111', '9': '0001011',
};
const LEFT_EVEN: Record<string, string> = {
  '0': '0100111', '1': '0110011', '2': '0011011', '3': '0100001', '4': '0011101',
  '5': '0111001', '6': '0000101', '7': '0010001', '8': '0001001', '9': '0010111',
};
const RIGHT: Record<string, string> = {
  '0': '1110010', '1': '1100110', '2': '1101100', '3': '1000010', '4': '1011100',
  '5': '1001110', '6': '1010000', '7': '1000100', '8': '1001000', '9': '1110100',
};
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

export const encodeEan13 = (value: string): string => {
  if (!/^\d{13}$/.test(value)) return '';
  const checksum = value
    .slice(0, 12)
    .split('')
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  if (Number(value[12]) !== (10 - (checksum % 10)) % 10) return '';
  const first = Number(value[0]);
  const left = value.slice(1, 7).split('').map((digit, index) =>
    PARITY[first][index] === 'L' ? LEFT_ODD[digit] : LEFT_EVEN[digit]
  ).join('');
  const right = value.slice(7).split('').map((digit) => RIGHT[digit]).join('');
  return `101${left}01010${right}101`;
};
