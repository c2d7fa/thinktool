export function classes(enabled: {[className: string]: boolean | undefined}): {className: string} {
  let result = "";
  for (const className in enabled) {
    if (enabled[className]) {
      if (result == "") result = className;
      else result += " " + className;
    }
  }
  return {className: result};
}
