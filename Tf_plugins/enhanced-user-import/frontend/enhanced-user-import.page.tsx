import { addPage, NamedPage } from '@hydrooj/ui-default';

addPage(new NamedPage(['manage_user_import_enhanced'], () => {
  console.log('🔴 Enhanced User Import React page loaded');
  console.log('🔴 Document ready state:', document.readyState);
  console.log('🔴 Looking for mount point...');
}));
