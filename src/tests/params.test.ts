import { ArgsParser } from "../commands/command";

const args = ['-p', '5', 'https://osu.ppy.sh/b/42', 'https://osu.ppy.sh/users/15/osu'];

test('basic string', async () => {
    const parser = new ArgsParser(args);
    const param = parser.getParam(['-p']);
    expect(param).toBe('5');
});

test('flexible', () => {
    const parser = new ArgsParser(args);
    const param = parser.getParamFlexible(['https://osu.ppy.sh/b/{param}']);
    expect(param).toBe('42');
});

test('wildcard', () => {
    const parser = new ArgsParser(args);
    const param = parser.getLink('https://osu.ppy.sh/users/{user}/{mode}');
    console.log(param)
    expect(param.user).toBe('15')
    expect(param.mode).toBe('osu')
});