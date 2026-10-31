import { Link, type LinkProps } from '@tanstack/react-router'
import { Fragment, type ReactNode } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'
import { SidebarToggle } from './sidebar-toggle'

export type Crumb = { label: string; link?: LinkProps }

export function WorkspacePage({
  crumbs,
  actions,
  className,
  children,
}: {
  crumbs: Crumb[]
  actions?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <>
      <PageHeader actions={actions}>
        <SidebarToggle />
        <PageCrumbs crumbs={crumbs} />
      </PageHeader>
      <div className={cn('mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-6 pb-12 md:px-8 md:pt-8', className)}>{children}</div>
    </>
  )
}

export function PageCrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <Fragment key={`${index}-${crumb.label}`}>
            {index > 0 && <BreadcrumbSeparator className="max-sm:hidden" />}
            <BreadcrumbItem className={cn(index < crumbs.length - 1 && 'max-sm:hidden')}>
              {crumb.link && index < crumbs.length - 1 ? (
                <BreadcrumbLink render={<Link {...crumb.link} />}>{crumb.label}</BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
