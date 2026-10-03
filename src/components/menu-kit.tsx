import {
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"

type WithChildren = { className?: string; children?: React.ReactNode }

/**
 * As peças em comum entre DropdownMenu e ContextMenu. Os menus do app são escritos uma vez
 * contra este kit e renderizados nos dois: no botão "⋯" e no clique direito.
 */
export interface MenuKit {
  Item: React.ComponentType<
    WithChildren & { onSelect?: (event: Event) => void; disabled?: boolean; variant?: "default" | "destructive" }
  >
  Label: React.ComponentType<WithChildren>
  Separator: React.ComponentType
  Sub: React.ComponentType<WithChildren>
  SubTrigger: React.ComponentType<WithChildren>
  SubContent: React.ComponentType<WithChildren>
}

export const dropdownKit: MenuKit = {
  Item: DropdownMenuItem,
  Label: DropdownMenuLabel,
  Separator: DropdownMenuSeparator,
  Sub: DropdownMenuSub,
  SubTrigger: DropdownMenuSubTrigger,
  SubContent: DropdownMenuSubContent,
}

export const contextKit: MenuKit = {
  Item: ContextMenuItem,
  Label: ContextMenuLabel,
  Separator: ContextMenuSeparator,
  Sub: ContextMenuSub,
  SubTrigger: ContextMenuSubTrigger,
  SubContent: ContextMenuSubContent,
}
