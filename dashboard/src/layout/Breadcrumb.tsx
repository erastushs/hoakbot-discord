export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-caption text-dashboard-text-tertiary">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li className="flex min-w-0 items-center gap-2" key={`${item.label}-${index}`}>
            {index > 0 ? <span aria-hidden>/</span> : null}
            {item.href ? (
              <a className="truncate transition duration-hover hover:text-dashboard-text-primary" href={item.href}>
                {item.label}
              </a>
            ) : (
              <span className="truncate">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
