import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

type SubscriberTagsSectionProps = {
  tagList: string[];
  editing: boolean;
  tags: string;
  onTagsChange: (value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
};

export function SubscriberTagsSection({
  tagList,
  editing,
  tags,
  onTagsChange,
  onAddTag,
  onRemoveTag,
}: Readonly<SubscriberTagsSectionProps>) {
  return (
    <div className="mt-6">
      <Label className="mb-2 block">Tags</Label>
      {editing ? (
        <div className="flex gap-2 mb-3">
          <Input
            value={tags}
            onChange={(e) => onTagsChange(e.target.value)}
            onKeyUp={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddTag();
              }
            }}
            placeholder="Add tag and press Enter"
            className="w-full"
          />
          <Button onClick={onAddTag} variant="outline">
            Add
          </Button>
        </div>
      ) : null}

      {tagList.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {tagList.map((tag) => (
            <div
              key={tag}
              className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm flex items-center gap-2"
            >
              {tag}
              {editing && (
                <button
                  onClick={() => onRemoveTag(tag)}
                  className="hover:bg-primary-foreground hover:text-primary rounded-full w-5 h-5 flex items-center justify-center text-lg"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
