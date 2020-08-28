export function classes(enabled: {[className: string]: boolean}): string {
  let enabledClasses = [];
  for (const className in enabled) {
    if (enabled[className]) enabledClasses.push(className);
  }
  return unwords(enabledClasses);
}

export function unwords(words: string[]): string {
  let result = "";
  for (const word of words) {
    if (result == "") result = word;
    else result += " " + word;
  }
  return result;
}
