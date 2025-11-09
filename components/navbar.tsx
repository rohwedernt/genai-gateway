import {
  Navbar as UINavbar,
  NavbarContent,
  NavbarMenuToggle,
  NavbarItem,
} from "@heroui/navbar";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { GithubIcon } from "@/components/icons";
import { FaArrowLeft } from "react-icons/fa6";


export const Navbar = () => {
  return (
    <UINavbar maxWidth="full" position="sticky">
      <NavbarContent
        className="hidden sm:flex sm:basis-full"
        justify="start"
      >
        <NavbarItem className="hidden sm:flex">
          <Button onPress={() => window.history.back()} variant="light" size="lg" startContent={<FaArrowLeft />}>Back</Button>
        </NavbarItem>
      </NavbarContent>

      <NavbarContent
        className="hidden sm:flex sm:basis-full pr-8"
        justify="end"
      >
        <NavbarItem className="hidden sm:flex gap-12">
          <Link isExternal aria-label="Github" href={siteConfig.links.github}>
            <GithubIcon size={32} className="text-default-500" />
          </Link>
          <ThemeSwitch className="transform scale-150" />
        </NavbarItem>
      </NavbarContent>

      <NavbarContent className="sm:hidden basis-1 pl-4" justify="end">
        <Link isExternal aria-label="Github" href={siteConfig.links.github}>
          <GithubIcon className="text-default-500" />
        </Link>
        <ThemeSwitch />
        <NavbarMenuToggle />
      </NavbarContent>
    </UINavbar>
  );
};
