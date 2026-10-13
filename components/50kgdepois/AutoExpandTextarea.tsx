'use client';

import { useCallback, useEffect, useRef } from 'react';
import { textareaClassName } from '@/components/whitelabel/cadastroMedico/CadastroMedicoFormUi';

type AutoExpandTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  large?: boolean;
  id?: string;
};

export default function AutoExpandTextarea({
  value,
  onChange,
  placeholder,
  large,
  id,
}: AutoExpandTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, large ? 220 : 140)}px`;
  }, [large]);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      id={id}
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={large ? 8 : 4}
      className={`${textareaClassName} leading-relaxed ${large ? 'min-h-[220px]' : 'min-h-[140px]'}`}
    />
  );
}
