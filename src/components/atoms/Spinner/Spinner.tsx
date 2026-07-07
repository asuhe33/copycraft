interface Props {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const sizeMap = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };

export function Spinner({ size = 'md', text }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6">
      <div
        className={`${sizeMap[size]} animate-spin rounded-full border-2 border-brand-500 border-t-transparent`}
      />
      {text && <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>}
    </div>
  );
}
