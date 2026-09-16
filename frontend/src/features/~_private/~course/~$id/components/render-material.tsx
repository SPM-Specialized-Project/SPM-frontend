import type { CourseContent } from '@/types/course-content';

import { MaterialSectionBody } from './material-section-body';
import { MaterialSectionHeader } from './material-section-header';
import type { SectionRendererProps } from './section-renderer-types';

type MaterialItem = Extract<CourseContent, { type: 'material' }>;

export function MaterialContent(props: SectionRendererProps<MaterialItem>) {
  const { item, userLocalStore } = props;
  return (
    <>
      <MaterialSectionHeader
        item={item}
        userLocalStore={userLocalStore}
        onUpdateItem={props.onUpdateItem}
        onDelete={props.onDelete}
      />
      <MaterialSectionBody
        item={item}
        changing={props.changing}
        onUpdateData={props.onUpdateData}
        setFile={props.setFile}
        getAssetUrl={props.getAssetUrl}
      />
    </>
  );
}
