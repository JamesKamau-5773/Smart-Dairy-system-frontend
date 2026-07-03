import { useEffect } from "react";

export function useFormPersistence(form, key) {
  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      form.reset(JSON.parse(saved));
    }
  }, [form, key]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      localStorage.setItem(key, JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [form, key]);
}
