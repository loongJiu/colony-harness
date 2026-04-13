export const withTimeout = async <T>(
  task: () => Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> => {
  let timer: NodeJS.Timeout | undefined

  try {
    return await Promise.race([
      task(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs)
      }),
    ])
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}
