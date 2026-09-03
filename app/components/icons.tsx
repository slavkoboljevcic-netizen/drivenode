import type { IconType } from "react-icons";
import {
  FiActivity,
  FiAlertCircle,
  FiArrowLeft,
  FiArrowRight,
  FiBarChart2,
  FiBell,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiClipboard,
  FiCreditCard,
  FiDownload,
  FiFileText,
  FiFilter,
  FiGrid,
  FiHome,
  FiMoreHorizontal,
  FiPlus,
  FiSearch,
  FiSettings,
  FiStar,
  FiTool,
  FiTruck,
  FiUserPlus,
  FiUsers,
  FiX,
} from "react-icons/fi";

const navigationIcons: IconType[] = [
  FiHome,
  FiTruck,
  FiClipboard,
  FiCalendar,
  FiUsers,
  FiTool,
  FiCreditCard,
  FiFileText,
  FiBarChart2,
  FiUserPlus,
];

export function NavigationIcon({ index }: { index: number }) {
  const Icon = navigationIcons[index] ?? FiGrid;
  return <Icon aria-hidden="true" />;
}

export {
  FiActivity as KpiIcon,
  FiAlertCircle as NoticeIcon,
  FiArrowLeft as BackIcon,
  FiArrowRight as ArrowRightIcon,
  FiBell as BellIcon,
  FiCheck as CheckIcon,
  FiChevronDown as ChevronDownIcon,
  FiChevronRight as ChevronRightIcon,
  FiDownload as DownloadIcon,
  FiFileText as DocumentIcon,
  FiFilter as FilterIcon,
  FiMoreHorizontal as MoreIcon,
  FiPlus as AddIcon,
  FiSearch as SearchIcon,
  FiSettings as SettingsIcon,
  FiStar as StarIcon,
  FiTruck as VehicleIcon,
  FiUserPlus as UserAddIcon,
  FiUsers as ClientsIcon,
  FiX as CloseIcon,
};
