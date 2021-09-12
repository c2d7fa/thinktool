import * as React from "react";

// Sometimes we want to pass a callback to some function that doesn't know about
// React, but which should still have access to the latest value of a prop
// passed to a component.
//
// This function lets us make the latest value of a prop available as a ref,
// which we can then dereference from inside such a callback.
export function usePropRef<T>(prop: T): React.RefObject<T> {
  const ref = React.useRef(prop);
  React.useEffect(() => {
    ref.current = prop;
  }, [prop]);
  return ref;
}

// Like 'useMemo', but prints a warning if the memoized value is replaced.
export function useMemoWarning<T>(label: string, refresh: () => T, dependencies?: React.DependencyList) {
  const wasInitializedRef = React.useRef(false);
  return React.useMemo(() => {
    if (wasInitializedRef.current) console.warn("Refreshing %o.", label);
    wasInitializedRef.current = true;
    return refresh();
  }, dependencies);
}
