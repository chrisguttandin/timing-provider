import { compareHops } from '../../../src/functions/compare-hops';

describe('compareHops()', () => {
    describe('without an origin in the first array', () => {
        it('should throw an error', () => {
            expect(() => compareHops([], [1])).to.throw(Error, 'Every vector should have an origin.');
        });
    });

    describe('without an origin in the second array', () => {
        it('should throw an error', () => {
            expect(() => compareHops([1], [])).to.throw(Error, 'Every vector should have an origin.');
        });
    });

    describe('with a different origin', () => {
        describe('with a lower origin in the first array', () => {
            describe('without any hops', () => {
                it('should return less than zero', () => {
                    expect(compareHops([1], [2])).to.be.below(0);
                });
            });

            describe('with less hops in the first array', () => {
                it('should return less than zero', () => {
                    expect(compareHops([1], [2, 3])).to.be.below(0);
                });
            });

            describe('with less hops in the second array', () => {
                it('should return less than zero', () => {
                    expect(compareHops([1, 3], [2])).to.be.below(0);
                });
            });
        });

        describe('with a lower origin in the second array', () => {
            describe('without any hops', () => {
                it('should return more than zero', () => {
                    expect(compareHops([2], [1])).to.be.above(0);
                });
            });

            describe('with less hops in the first array', () => {
                it('should return more than zero', () => {
                    expect(compareHops([2], [1, 3])).to.be.above(0);
                });
            });

            describe('with less hops in the second array', () => {
                it('should return more than zero', () => {
                    expect(compareHops([2, 3], [1])).to.be.above(0);
                });
            });
        });
    });

    describe('with the same origin', () => {
        describe('without any hops', () => {
            it('should throw an error', () => {
                expect(() => compareHops([1], [1])).to.throw(Error, 'At least one vector should have a hop if they have the same origin.');
            });
        });

        describe('with the same number hops', () => {
            describe('without any duplicated hops', () => {
                it('should return zero', () => {
                    expect(compareHops([1, 2], [1, 3])).to.equal(0);
                });
            });

            describe('with duplicated hops in the first array', () => {
                it('should return more than zero', () => {
                    expect(compareHops([1, 2, 2], [1, 3, 4])).to.be.above(0);
                });
            });

            describe('with duplicated hops in the second array', () => {
                it('should return less than zero', () => {
                    expect(compareHops([1, 3, 4], [1, 2, 2])).to.be.below(0);
                });
            });

            describe('with duplicated hops in both arrays', () => {
                describe('with the same number of duplicated hops', () => {
                    describe('with a lower duplicated value in the first array', () => {
                        describe('without any extra hops', () => {
                            it('should return less than zero', () => {
                                expect(compareHops([1, 2, 2], [1, 3, 3])).to.be.below(0);
                            });
                        });

                        describe('without one extra hop', () => {
                            it('should return less than zero', () => {
                                expect(compareHops([1, 2, 2, 5], [1, 3, 3, 4])).to.be.below(0);
                            });
                        });
                    });

                    describe('with a lower duplicated value in the second array', () => {
                        describe('without any extra hops', () => {
                            it('should return more than zero', () => {
                                expect(compareHops([1, 3, 3], [1, 2, 2])).to.be.above(0);
                            });
                        });

                        describe('without one extra hop', () => {
                            it('should return more than zero', () => {
                                expect(compareHops([1, 3, 3, 4], [1, 2, 2, 5])).to.be.above(0);
                            });
                        });
                    });

                    describe('with the same duplicated value', () => {
                        describe('without any extra hops', () => {
                            it('should throw an error', () => {
                                expect(() => compareHops([1, 2, 2], [1, 2, 2])).to.throw(Error, 'Every vector should be unique.');
                            });
                        });

                        describe('without one extra hop', () => {
                            it('should return zero', () => {
                                expect(compareHops([1, 2, 2, 3], [1, 2, 2, 4])).to.equal(0);
                            });
                        });
                    });
                });

                describe('with less duplicated hops in the first array', () => {
                    it('should return less than zero', () => {
                        expect(compareHops([1, 3, 3, 4], [1, 2, 2, 2])).to.be.below(0);
                    });
                });

                describe('with less duplicated hops in the second array', () => {
                    it('should return more than zero', () => {
                        expect(compareHops([1, 2, 2, 2], [1, 3, 3, 4])).to.be.above(0);
                    });
                });
            });
        });

        describe('with less hops in the first array', () => {
            describe('without any hops in the first array', () => {
                it('should return less than zero', () => {
                    expect(compareHops([1], [1, 2])).to.be.below(0);
                });
            });

            describe('without any duplicated hops', () => {
                it('should return less than zero', () => {
                    expect(compareHops([1, 2], [1, 3, 4])).to.be.below(0);
                });
            });

            describe('with duplicated hops in the first array', () => {
                it('should return more than zero', () => {
                    expect(compareHops([1, 2, 2], [1, 3, 4, 5])).to.be.above(0);
                });
            });

            describe('with duplicated hops in the second array', () => {
                it('should return less than zero', () => {
                    expect(compareHops([1, 3], [1, 2, 2])).to.be.below(0);
                });
            });

            describe('with duplicated hops in both arrays', () => {
                describe('with a lower duplicated value in the first array', () => {
                    it('should return less than zero', () => {
                        expect(compareHops([1, 2, 2], [1, 3, 3, 4])).to.be.below(0);
                    });
                });

                describe('with a lower duplicated value in the second array', () => {
                    it('should return more than zero', () => {
                        expect(compareHops([1, 3, 3], [1, 2, 2, 4])).to.be.above(0);
                    });
                });

                describe('with the same duplicated value', () => {
                    it('should return less than zero', () => {
                        expect(compareHops([1, 2, 2], [1, 2, 2, 3])).to.be.below(0);
                        expect(compareHops([1, 2, 2, 5], [1, 2, 2, 3, 4])).to.be.below(0);
                    });
                });
            });
        });

        describe('with less hops in the second array', () => {
            describe('without any in the second array', () => {
                it('should return more than zero', () => {
                    expect(compareHops([1, 2], [1])).to.be.above(0);
                });
            });

            describe('without any duplicated hops', () => {
                it('should return more than zero', () => {
                    expect(compareHops([1, 2, 3], [1, 4])).to.be.above(0);
                });
            });

            describe('with duplicated hops in the first array', () => {
                it('should return more than zero', () => {
                    expect(compareHops([1, 2, 2], [1, 3])).to.be.above(0);
                });
            });

            describe('with duplicated hops in the second array', () => {
                it('should return less than zero', () => {
                    expect(compareHops([1, 3, 4, 5], [1, 2, 2])).to.be.below(0);
                });
            });

            describe('with duplicated hops in both arrays', () => {
                describe('with a lower duplicated value in the first array', () => {
                    it('should return less than zero', () => {
                        expect(compareHops([1, 2, 2, 4], [1, 3, 3])).to.be.below(0);
                    });
                });

                describe('with a lower duplicated value in the second array', () => {
                    it('should return more than zero', () => {
                        expect(compareHops([1, 3, 3, 4], [1, 2, 2])).to.be.above(0);
                    });
                });

                describe('with the same duplicated value', () => {
                    it('should return more than zero', () => {
                        expect(compareHops([1, 2, 2, 3], [1, 2, 2])).to.be.above(0);
                        expect(compareHops([1, 2, 2, 3, 4], [1, 2, 2, 5])).to.be.above(0);
                    });
                });
            });
        });
    });
});
