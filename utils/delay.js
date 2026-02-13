export async function randomDelay(min = 3000, max = 7000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`[DELAY] Waiting ${delay} ms`);
  return new Promise(resolve => setTimeout(resolve, delay));
}